# 结合差分隐私训练的认证删除 (Certified Removal)

> 取自 https://arxiv.org/abs/1911.03030

# 定理

假设 $\Phi$ 是一个满足 $(\epsilon_{\mathrm{DP}},\delta_{\mathrm{DP}})$\-差分隐私，也即满足

> 设数据集为 $\mathcal D$，与之相邻的 $\mathcal D'=\mathcal D\setminus\{x\}$ 是删除一条样本后的数据集，$S$ 是输出空间中的任意可测事件。如果对所有相邻数据集 $\mathcal D,\mathcal D'$ 和所有事件 $S$，随机化算法 $\Phi$ 满足
> 
> $$
> P\bigl(\Phi(\mathcal D)\in S\bigr)
> \leq
> e^{\epsilon_{\mathrm{DP}}}
> P\bigl(\Phi(\mathcal D')\in S\bigr)
> +\delta_{\mathrm{DP}},
> $$
> 
> 和
> 
> $$
> P\bigl(\Phi(\mathcal D')\in S\bigr)
> \leq
> e^{\epsilon_{\mathrm{DP}}}
> P\bigl(\Phi(\mathcal D)\in S\bigr)
> +\delta_{\mathrm{DP}}.
> $$

的随机化学习算法，输出的特征提取器可以用来训练模型。

对于训练出的模型，采用一个能够保证 $(\epsilon_{\mathrm{CR}},\delta_{\mathrm{CR}})$\-认证删除，也即满足

> 设数据集为 $D$，样本 $\mathbf x\in D$ 为要删除的样本；训练算法为 $A$，在数据集 $D$ 上训练后得到的模型记为 $A(D)$. 删除机制 $M$ 输出的模型记作 $M(A(D),D,\mathbf x)$，$P(\cdot)$ 是事件发生的概率。记 $\mathcal H$ 是所有可能的模型集合，对任一子集 $\mathcal T\subseteq\mathcal H$，都有
> 
> $$
> P\bigl(M(A(D), D, \mathbf{x}) \in T\bigr)
> \le e^{\varepsilon} P\bigl(A(D \setminus \mathbf{x}) \in T\bigr) + \delta
> $$
> 
> 且
> 
> $$
> P\bigl(A(D \setminus \mathbf{x}) \in T\bigr)
> \le e^{\varepsilon} P\bigl(M(A(D), D, \mathbf{x}) \in T\bigr) + \delta
> $$

的删除机制 $M$。

那么，整个过程能够保证 $(\epsilon_{\mathrm{DP}}+\epsilon_{\mathrm{CR}},
\delta_{\mathrm{DP}}+\delta_{\mathrm{CR}})$\-认证删除。

# 定理的证明

设数据集为 $\mathcal D$，令

$$
\mu(S)=P\bigl(\Phi(\mathcal D)\in S\bigr)
$$

表示 $\Phi$ 输出的特征提取器属于 $S$ 的概率。（事实上，这是在所有可能的特征提取器所构成的空间 $\Omega$ 上诱导出的**概率测度**）

令 $\mathcal D'=\mathcal D\setminus\{x\}$ 表示从数据集 $\mathcal D$ 中删除样本 $x$ 后得到的数据集，并令 $\mu'(\cdot)$ 表示 $\Phi(\mathcal D')$ 所对应的概率测度。

由于 $\Phi$ 满足 $(\epsilon_{\mathrm{DP}},\delta_{\mathrm{DP}})$\-差分隐私，因此对于任意 $S\subseteq\Omega$，以概率 $1-\delta_{\mathrm{DP}}$，有

$$
\mu(S)
=
P\bigl(\Phi(\mathcal D)\in S\bigr)
\leq
e^{\epsilon_{\mathrm{DP}}}
P\bigl(\Phi(\mathcal D')\in S\bigr)
=
e^{\epsilon_{\mathrm{DP}}}\mu'(S).
$$

这说明 $\mu$ 关于 $\mu'$ 绝对连续。由于二者都是概率测度，存在 Radon–Nikodym 导数 $g$.

$g$ 关于 $\mu'$ 几乎处处以 $e^{\epsilon_{\mathrm{DP}}}$ 为上界：假设存在某个集合 $S\subseteq\Omega$，满足 $\mu'(S)>0$，并且对于某个 $\alpha>0$，在 $S$ 上有

$$
g\geq e^{\epsilon_{\mathrm{DP}}}+\alpha,
$$

那么

$$
\mu(S)
=
\int_S g\,d\mu'
\geq
\bigl(e^{\epsilon_{\mathrm{DP}}}+\alpha\bigr)\mu'(S)
\geq
\mu(S)+\alpha\mu'(S),
$$

这导致了矛盾。

对于 $\Phi(\mathcal D)$ 的一个可能取值 $\phi\in\Omega$，令 $A(\mathcal D,\phi)$ 表示使用特征提取器 $\phi$ 在数据集 $\mathcal D$ 上训练模型的学习算法。则有：

$$
\begin{aligned}
&P\Bigl(
M\bigl(A(\mathcal D,\Phi(\mathcal D)),\mathcal D,x\bigr)
\in\mathcal T
\Bigr)
\\
&=
\int_{\Omega}
P\Bigl(
M\bigl(A(\mathcal D,\phi),\mathcal D,x\bigr)
\in\mathcal T
\Bigr)\,\mu(d\phi)
\\
&\leq
\int_{\Omega}
e^{\epsilon_{\mathrm{CR}}}
P\bigl(A(\mathcal D',\phi)\in\mathcal T\bigr)\,\mu(d\phi)
\\
&=
\int_{\Omega}
e^{\epsilon_{\mathrm{CR}}}
P\bigl(A(\mathcal D',\phi)\in\mathcal T\bigr)
\,g\,\mu'(d\phi)
\\
&\leq
\int_{\Omega}
e^{\epsilon_{\mathrm{DP}}+\epsilon_{\mathrm{CR}}}
P\bigl(A(\mathcal D',\phi)\in\mathcal T\bigr)\,\mu'(d\phi)
\\
&=
e^{\epsilon_{\mathrm{DP}}+\epsilon_{\mathrm{CR}}}
P\Bigl(
A\bigl(\mathcal D',\Phi(\mathcal D')\bigr)
\in\mathcal T
\Bigr).
\end{aligned}
$$

上述结论以至少 $1-\delta_{\mathrm{DP}}-\delta_{\mathrm{CR}}$ 的概率成立。

下界可以用类似的方法，这就证明了结论。

# 前置知识

## 随机化算法

普通的确定性算法只要输入数据集 $\mathcal D$ 相同，每次运行都会得到完全相同的输出 $\phi$。

而随机化算法除了接收数据集 $\mathcal D$，还会使用随机变量，具有随机性，例如：

-   随机初始化的模型参数；
    
-   随机打乱的数据顺序；
    
-   随机选择的 mini-batch；
    
-   主动加入的噪声；
    
-   其他随机种子产生的随机性。
    

所以，即使数据集 $\mathcal D$ 完全相同，多次运行也可能得到不同的模型。

## 测度的绝对连续【需测度论基础】

设 $\mu,\nu$ 是两个测度。如果对任意可测集合 $A$，

$$
\mu(A)=0\Longrightarrow \nu(A)=0,
$$

则称 $\nu$ 关于 $\mu$ 绝对连续，记作

$$
\nu\ll\mu.
$$

意思是：所有被 $\mu$ 视为“零测集”的集合，也必须被 $\nu$ 视为零测集。

## Radon--Nikodym 导数【需测度论基础】

设 $\mu,\mu'$ 是同一可测空间 $(X,\mathcal F)$ 上的正测度。如果

1.  $\mu\ll\mu'$；
    
2.  $\mu$ 和 $\mu'$ 都是 $\sigma$\-有限测度，
    

那么存在非负可测函数 $g$，使得对所有 $A\in\mathcal F$，

$$
\mu(A)=\int_A g\,d\mu'.
$$

此时记作

$$
g=\frac{d\mu}{d\mu'}.
$$

而且 $g$ 在 $\mu'$\-几乎处处意义下唯一。

特别地，如果 $\mu,\mu'$ 都是有限测度或概率测度，那么它们自动是 $\sigma$\-有限的，因此只要 $\mu\ll\mu'$，Radon–Nikodym 导数就存在。

在本定理的证明中使用了它的一个性质：对于任意非负可测函数 $h:\Omega\to[0,\infty]$，都有

$$
\int_\Omega h\,d\mu=\int_\Omega h g\,d\mu'
$$

**证明：**

设

$$
\mu(E)=\int_E g\,d\mu'
\qquad(E\in\mathcal F),
$$

其中 $g=\frac{d\mu}{d\mu'}\ge 0$。

**先考虑示性函数的情况。**

若 $h=\mathbf 1_E$，则

$$
\int_\Omega h\,d\mu
=\int_\Omega \mathbf 1_E\,d\mu
=\mu(E).
$$

根据 Radon–Nikodym 导数的定义，

$$
\mu(E)=\int_E g\,d\mu'
=\int_\Omega \mathbf 1_E g\,d\mu'.
$$

因此

$$
\int_\Omega \mathbf 1_E\,d\mu
=
\int_\Omega \mathbf 1_Eg\,d\mu'.
$$

进一步地，设 $h$ 是非负简单函数，可以写成

$$
h=\sum_{k=1}^n a_k\mathbf 1_{E_k},
\qquad a_k\ge 0,
$$

其中 $E_1,\ldots,E_n$ 是两两不交的可测集合。

根据简单函数积分的定义，

$$
\begin{aligned}
\int_\Omega h\,d\mu
&=\sum_{k=1}^n a_k\mu(E_k)\\
&=\sum_{k=1}^n a_k\int_{E_k}g\,d\mu'\\
&=\int_\Omega\sum_{k=1}^n a_k\mathbf 1_{E_k}g\,d\mu'\\
&=\int_\Omega hg\,d\mu'.
\end{aligned}
$$

所以该等式对所有非负简单函数成立。

之后扩展到一般非负可测函数。设

$$
h:\Omega\to[0,\infty]
$$

是非负可测函数。根据简单函数逼近定理，存在一列非负简单函数 $(h_n)$，使得

$$
0\le h_1\le h_2\le\cdots,\qquad h_n(\omega)\uparrow h(\omega).
$$

由于 $g\ge 0$，也有

$$
h_ng\uparrow hg.
$$

由单调收敛定理，

$$
\int_\Omega h\,d\mu
=
\lim_{n\to\infty}\int_\Omega h_n\,d\mu.
$$

而每个 $h_n$ 都是非负简单函数，所以

$$
\int_\Omega h_n\,d\mu
=
\int_\Omega h_ng\,d\mu'.
$$

因此

$$
\begin{aligned}
\int_\Omega h\,d\mu
&=\lim_{n\to\infty}\int_\Omega h_n\,d\mu'\\
&=\lim_{n\to\infty}\int_\Omega h_ng\,d\mu'\\
&=\int_\Omega hg\,d\mu',
\end{aligned}
$$

（最后一步再次使用了单调收敛定理）

这里两边都允许取 $+\infty$，因此不需要额外假设 $h$ 可积。这就证明了结论。

-   如果 $h$ 是有正有负的实值函数，并且 $h\in L^1(\mu)$，将其分解为 $h=h^+-h^-$ 再分别对 $h^+$ 和 $h^-$ 使用上面的结论，就得到同样的换测度公式：
    

$$
\int_\Omega h\,d\mu
=
\int_\Omega hg\,d\mu'.
$$

-   $\sigma$\-有限等条件主要用于保证 $g$ 的存在；一旦已经有一个 $g$ 满足
    

$$
\mu(E)=\int_Eg\,d\mu',
$$

上面的积分换元公式本身不再需要额外的 $\sigma$\-有限假设。

> 封面取自 https://osu.ppy.sh/beatmapsets/1995184#osu/4146401 Camellia feat. Ninomae Ina'nis - Drenched in Air
