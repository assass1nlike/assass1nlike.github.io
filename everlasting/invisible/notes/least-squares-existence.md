# 最小二乘问题解的存在性

> 问题背景取自 https://arxiv.org/abs/2502.07218

**目录**

定理 定理的证明 背景

# 定理

假设 $H\in\mathbb R^{m\times p},A\in\mathbb R^{m\times q}$ 都是固定的矩阵，$W\in\mathbb R^{p\times q}$ 是待优化的矩阵变量，则

$$
\underset{W}{\arg\min}\,\|HW-A\|_F^2,
$$

一定有全局最优解，且 Frobenius 范数最小的解为 $W=H^\dagger A$，其中 $H^\dagger$​ 是 Moore–Penrose 伪逆，也即满足以下四个条件的唯一矩阵：

$$
HH^\dagger H=H,
\tag{MP1}
$$

$$
H^\dagger HH^\dagger=H^\dagger,
\tag{MP2}
$$

$$
(HH^\dagger)^\top=HH^\dagger,
\tag{MP3}
$$

$$
(H^\dagger H)^\top=H^\dagger H,
\tag{MP4}
$$

在 $H$ 列满秩时，最优解唯一。

# 定理的证明

令 $H^\dagger$ 为 $H$​ 的 Moore–Penrose 伪逆，且记

$$
P_H:=HH^\dagger.
$$

基于它给出分解：

$$
HW-A
=(HW-P_HA)+(P_HA-A).
$$

记

$$
X:=HW-P_HA,\qquad
Y:=P_HA-A.
$$

于是

$$
HW-A=X+Y.
$$

考虑 $X$ 和 $Y$ 的列空间。

对于 $X$，由于 $HW$ 的每一列都属于 $\operatorname{col}(H)$，而 $P_HA=HH^\dagger A$ 的每一列也属于 $\operatorname{col}(H)$，所以它们的差仍然属于 $\operatorname{col}(H)$。因此

$$
\operatorname{col}(X)\subseteq\operatorname{col}(H).
$$

对于 $Y$，我们来证明

$$
\operatorname{col}(Y)\subseteq\operatorname{col}(H)^\perp.
$$

首先，由 $P_H=HH^\dagger$ 可知，$P_H$ 的每一列都是 $H$ 的列的线性组合，因此

$$
\operatorname{col}(P_H)\subseteq \operatorname{col}(H).
$$

反过来，任取 $y\in\operatorname{col}(H)$，则存在某个向量 $x$，使得

$$
y=Hx
$$

于是由 $(\mathrm{MP1})$，

$$
P_Hy
=HH^\dagger Hx
=Hx
=y.
$$

这说明 $\operatorname{col}(H)$ 中的每个向量都是 $P_H$ 的像，因此

$$
\operatorname{col}(H)\subseteq \operatorname{col}(P_H).
$$

综上

$$
\operatorname{col}(P_H)=\operatorname{col}(H).
$$

所以只需证明

$$
\operatorname{col}(Y)\subseteq\operatorname{col}(P_H)^\perp
$$

也即对于任意向量 $z$，有 $P_Hz-z\in\operatorname{col}(P_H)^\perp.$

我们有

$$
P_H(P_Hz-z)
=P_H^2z-P_Hz
=P_Hz-P_Hz
=0.
$$

则

$$
P_Hz-z\in\operatorname{ker}(P_H).
$$

记 $P=P_H$，那就需要证明

$$
\ker(P)=\operatorname{col}(P)^\perp,
$$

先证明 $\ker(P)\subseteq \operatorname{col}(P)^\perp$.

任取

$$
x\in\ker(P),\qquad y\in\operatorname{col}(P)
$$

根据列空间的定义，存在某个向量 $z$，使得

$$
y=Pz.
$$

于是

$$
\langle x,y\rangle
=\langle x,Pz\rangle
=\operatorname{tr}(x^\top Pz)
=\operatorname{tr}(z^\top P^\top x)
=\langle z,P^\top x\rangle
=\langle z,Px\rangle
=0.
$$

因此 $x$ 与 $\operatorname{col}(P)$ 中的任意向量都正交，即

$$
x\in\operatorname{col}(P)^\perp.
$$

所以

$$
\ker(P)\subseteq\operatorname{col}(P)^\perp.
$$

再证明 $\operatorname{col}(P)^\perp\subseteq\ker(P)$。

任取

$$
x\in\operatorname{col}(P)^\perp.
$$

由于 $Px$ 显然属于 $\operatorname{col}(P)$，所以

$$
\langle x,Px\rangle=0.
$$

由 $(\mathrm{MP1})$ 可得

$$
P^2
=(HH^\dagger)(HH^\dagger)
=H(H^\dagger H)H^\dagger
=(HH^\dagger H)H^\dagger
=HH^\dagger
=P.
$$

所以 $P$ 是幂等矩阵。因此

$$
\begin{aligned}
\|Px\|^2
&=\langle Px,Px\rangle\\
&=\langle x,P^\top Px\rangle\\
&=\langle x,P^2x\rangle\\
&=\langle x,Px\rangle\\
&=0.
\end{aligned}
$$

从而

$$
Px=0.
$$

所以

$$
x\in\ker(P).
$$

于是

$$
\operatorname{col}(P)^\perp\subseteq\ker(P).
$$

综上

$$
\ker(P)=\operatorname{col}(P)^\perp.
$$

又因为前面已经证明

$$
\operatorname{col}(P_H)=\operatorname{col}(H),
$$

所以

$$
\ker(P_H)=\operatorname{col}(H)^\perp.
$$

这就证明了对于任意向量 $z$，有 $z-P_Hz\in\operatorname{col}(H)^\perp.$

于是，$X$ 的每一列都属于 $\operatorname{col}(H)$，而 $Y$ 的对应列都属于 $\operatorname{col}(H)^\perp$。因此对于每一列 $j$，都有

$$
X_{:j}^\top Y_{:j}=0.
$$

Frobenius 内积定义为

$$
\langle X,Y\rangle_F
:=\operatorname{tr}(X^\top Y)
=\sum_j X_{:j}^\top Y_{:j}.
$$

因此

$$
\langle X,Y\rangle_F=0.
$$

从而

$$
\begin{aligned}
\|HW-A\|_F^2
&=\|X+Y\|_F^2\\
&=\langle X+Y,X+Y\rangle_F\\
&=\|X\|_F^2+\|Y\|_F^2
  +2\langle X,Y\rangle_F\\
&=\|X\|_F^2+\|Y\|_F^2.
\end{aligned}
$$

代回 $X,Y$ 的定义，得到

$$
\|HW-A\|_F^2
=
\|HW-P_HA\|_F^2
+
\|P_HA-A\|_F^2
\ge
\|P_HA-A\|_F^2
$$

考虑取等条件。当

$$
W=W^\star=H^\dagger A
$$

时，

$$
HW^\star=P_HA.
$$

此时取得等号。这就证明了，全局最优解是存在的。

下面证明，所有最小二乘解都可以写成

$$
W=W^\star+N,\qquad HN=0;
$$

如果它成立就自然证明了，若 $H$ 列满秩，则最小二乘解唯一。

首先，由前面的证明，所有最优解都应该满足

$$
HW-P_HA=0,
$$

也就是

$$
HW=P_HA.
$$

现在令 $W$ 为任意一个最小二乘解。由 $HW^\star=P_HA$，有

$$
HW=HW^\star.
$$

因此

$$
H(W-W^\star)=0.
$$

令

$$
N:=W-W^\star,
$$

则

$$
HN=0.
$$

反过来，如果 $N$ 满足

$$
HN=0,
$$

那么

$$
H(W^\star+N)
=HW^\star+HN
=P_HA.
$$

所以 $W^\star+N$ 也是最小二乘解。

因此，所有最小二乘解都可以写成

$$
W=H^\dagger A+N,\qquad HN=0.
$$

接下来证明，若 $H$ 不满列秩，则 $W^\star$ 是唯一的最小 Frobenius 范数最小二乘解。

设 $W$ 是任意最小二乘解。由前面的刻画，

$$
W=W^\star+N,\qquad HN=0.
$$

我们要证明

$$
\|W\|_F^2
=
\|W^\star\|_F^2+\|N\|_F^2.
$$

关键是证明 $W^\star$ 与 $N$ 在 Frobenius 内积下正交。由 $HN=0$ 可知 $N$ 的每一列都属于 $\ker(H)$，从而只需要证明 $W^\star$ 的列属于 $\ker(H)^\perp$.

任取 $x\in\ker(H)$，即 $Hx=0$。任取向量 $y$，考虑

$$
x^\top H^\dagger y.
$$

由于 Moore–Penrose 条件

$$
H^\dagger HH^\dagger=H^\dagger,
$$

有

$$
H^\dagger y=H^\dagger H H^\dagger y.
$$

因此

$$
\begin{aligned}
x^\top H^\dagger y
&=x^\top H^\dagger H H^\dagger y\\
&=(H^\dagger Hx)^\top H^\dagger y.
\end{aligned}
$$

而

$$
H^\dagger Hx=H^\dagger(Hx)=0,
$$

所以

$$
x^\top H^\dagger y=0.
$$

这说明 $H^\dagger y$ 与 $\ker(H)$ 中任意向量都正交，即

$$
H^\dagger y\in\ker(H)^\perp.
$$

由于 $W^\star=H^\dagger A$，其每一列都是 $H^\dagger y$ 的形式，因此

$$
\operatorname{col}(W^\star)\subseteq\ker(H)^\perp.
$$

从而，设 $w_j^\star$ 和 $n_j$ 分别是 $W^\star$ 和 $N$ 的第 $j$ 列，则它们分别属于 $\ker(H)$ 和 $\ker(H)^\perp$，满足

$$
(w_j^\star)^*n_j=0.
$$

于是

$$
\begin{aligned}
\langle W^\star,N\rangle_F
&=\operatorname{tr}\bigl((W^\star)^*N\bigr)\\
&=\sum_j (w_j^\star)^*n_j\\
&=0.
\end{aligned}
$$

因此

$$
\begin{aligned}
\|W\|_F^2
&=\|W^\star+N\|_F^2\\
&=\|W^\star\|_F^2+\|N\|_F^2.
\end{aligned}
$$

这就证明了我们的结论，在

$$
\|N\|_F=0,
$$

即 $N=0$ 时，解 $W$ 取得最小范数。这个解就是 Moore–Penrose 伪逆。

可以说，伪逆解 $H^\dagger A$ 从所有实现同样最小残差的解中，去掉了位于 $\ker(H)$ 方向上的冗余分量。

# 背景

论文的方法是，通过调整模型特定 MLP 层的下投影矩阵 $W$，让模型对于一些输入的激活 $H$ 被调整为特定的人工改动过的激活 $A$。

我们希望的是

$$
\|HW-A\|_F=0
$$

对于这个式子，对 $W$ 求导后令梯度为零，整理后可以得到

$$
H^\top HW
=
H^\top A
$$

如果 $H^\top H$ (Gram 矩阵) 可逆，我们就能求出闭式解。但是

$$
\begin{aligned}
&\hphantom{\Leftrightarrow\ } H^\top H \text\,{可逆}\\
&\Leftrightarrow
\text{不存在}\,v\neq\mathbf 0\,\text{使得}\, H^\top Hv=\mathbf0\\
&\Leftrightarrow
\text{不存在}\,v\neq\mathbf 0\,\text{使得}\,Hv=\mathbf0\\

\end{aligned}
$$

意味着中间层的向量必须每列线性无关，这不一定成立。因此，改为求解以下优化问题：

$$
\underset{W}{\arg\min}\;
\left\|HW-A\right\|_F^2
$$

事实上，如果引入 weight decay：

$$
\underset{W}{\arg\min}\;
\left\|HW-A\right\|_F^2
+
\lambda\|W\|_F^2,
$$

此时对 $W$ 求导后令梯度为零，整理后可以得到

$$
(H^\top HW+\lambda I)
=
H^\top A
$$

在 $\lambda>0$ 时，$H^\top HW+\lambda I$ 是正定矩阵，因此可以求出闭式解。

> 封面取自
> 
> https://osu.ppy.sh/beatmapsets/2394799#osu/5186703
> 
> Dragon Guardian - Jashin e no Chinkonka
